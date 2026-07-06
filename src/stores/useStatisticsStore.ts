/**
 * 领料统计 Zustand Store
 *
 * 架构：enhancedApiClient → API（无缓存层，V2.1 铁律）
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/material-statistics
 * 参考样板: useTempTaskStore.ts (FIELD_MAP + normalize/denormalize 模式)
 *
 * 统计数据从 material_requests/material_executes 表中聚合计算
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

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

export interface MonthlyStatItem {
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

export interface CategorySummaryItem {
  name: string;
  key: string;
  value: number;
  amount: number;
  percentage: number;
  gradient: string[];
  solid: string;
}

export interface CategoryTrendItem {
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

export interface StatisticsData {
  materialStatistics: MaterialStatItem[];
  monthlyStatistics: MonthlyStatItem[];
  categorySummary: CategorySummaryItem[];
  categoryTrend: CategoryTrendItem[];
}

// ==================== 第二步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  material_code: 'materialCode',
  material_name: 'materialName',
  category: 'category',
  spec: 'spec',
  barcode: 'barcode',
  unit: 'unit',
  supplier: 'supplier',
  batch_code: 'batchCode',
  production_date: 'productionDate',
  expiry_date: 'expiryDate',
  production_plan_batch_code: 'productionPlanBatchCode',
  requisition_department: 'requisitionDepartment',
  usage_area: 'usageArea',
  requisitioner: 'requisitioner',
  requisition_time: 'requisitionTime',
  requisition_count: 'requisitionCount',
  total_quantity: 'totalQuantity',
  actual_quantity: 'actualQuantity',
  total_amount: 'totalAmount',
  main_warehouse: 'mainWarehouse',
  // 月度统计字段
  year: 'year',
  month: 'month',
  department: 'department',
  material_types: 'materialTypes',
  difference_rate: 'differenceRate',
  // 分类汇总字段
  name: 'name',
  key: 'key',
  value: 'value',
  amount: 'amount',
  percentage: 'percentage',
  gradient: 'gradient',
  solid: 'solid',
};

// ==================== 第三步：规范化函数 ====================

function normalizeMaterialStat(db: Record<string, unknown>): MaterialStatItem {
  const result: Record<string, unknown> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in db) result[camel] = db[snake];
  }
  return result as unknown as MaterialStatItem;
}

function normalizeMonthlyStat(db: Record<string, unknown>): MonthlyStatItem {
  const result: Record<string, unknown> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in db) result[camel] = db[snake];
  }
  return result as unknown as MonthlyStatItem;
}

// ==================== 第四步：Store 接口 ====================

interface StatisticsState {
  materialStatistics: MaterialStatItem[];
  monthlyStatistics: MonthlyStatItem[];
  categorySummary: CategorySummaryItem[];
  categoryTrend: CategoryTrendItem[];
  isLoading: boolean;
  error: string | null;

  fetchStatistics: () => Promise<void>;
}

// ==================== 第五步：获取月份汇总和明细（工具函数）============

/**
 * 金额来源：后端 category_summary 已基于真实 unitPrice × qty 计算（单位：万元）。
 * 月度金额按"该月数量占该分类全年数量的比例"从分类金额分摊，避免重复计算单价。
 */

/** 获取月份汇总数据 */
export function getMonthSummaries(year: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]): MonthSummaryRow[] {
  const yearTotalAmount = categories.reduce((s, c) => s + c.amount, 0);
  const yearTotal = trend.filter(d => d.month.startsWith(year)).reduce((s, d) => s + d.total, 0);
  return trend
    .filter(d => d.month.startsWith(year))
    .map(data => {
      const totalQty = data.total;
      const totalAmt = yearTotal > 0 ? (totalQty / yearTotal) * yearTotalAmount : 0;
      return {
        month: data.month,
        monthName: `${parseInt(data.month.split('-')[1])}月`,
        totalQuantity: totalQty,
        totalAmount: Math.round(totalAmt * 100) / 100,
        percentage: yearTotal > 0 ? (totalQty / yearTotal) * 100 : 0,
      };
    });
}

export interface MonthSummaryRow {
  month: string;
  monthName: string;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
}

/** 获取月份分类明细 */
export function getMonthDetails(month: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]): MonthDetailRow[] {
  const monthData = trend.find(d => d.month === month);
  if (!monthData) return [];
  const totalQty = monthData.total;
  return categories.map(cat => {
    const qty = (monthData as Record<string, number>)[cat.key] || 0;
    // 用分类全年的 (qty, amount) 比例，分摊得到该月该分类的金额（amount 单位：万元）
    const catAmount = cat.value > 0 ? (qty / cat.value) * cat.amount : 0;
    return {
      month,
      monthName: `${parseInt(month.split('-')[1])}月`,
      categoryKey: cat.key,
      categoryName: cat.name,
      quantity: qty,
      amount: Math.round(catAmount * 100) / 100,
      percentage: totalQty > 0 ? (qty / totalQty) * 100 : 0,
    };
  });
}

export interface MonthDetailRow {
  month: string;
  monthName: string;
  categoryKey: string;
  categoryName: string;
  quantity: number;
  amount: number;
  percentage: number;
}

/** 年度总数量 */
export function getYearTotalQuantity(year: string, trend: CategoryTrendItem[]): number {
  return trend.filter(d => d.month.startsWith(year)).reduce((s, d) => s + d.total, 0);
}

/** 年度总金额（万元）- 使用后端 category_summary 的实际金额 */
export function getYearTotalAmount(_year: string, _trend: CategoryTrendItem[], categories: CategorySummaryItem[]): number {
  return categories.reduce((s, c) => s + c.amount, 0);
}

/** 单月明细 */
export function getSingleMonthTableData(year: string, month: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]): MonthDetailRow[] {
  return getMonthDetails(`${year}-${month}`, trend, categories);
}

/** 月份分类柱状图数据 - 金额按分类总量比例分摊 */
export function getMonthCategoryData(month: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]) {
  const monthData = trend.find(d => d.month === month);
  if (!monthData) return [];
  return categories.map(cat => {
    const value = (monthData as Record<string, number>)[cat.key] || 0;
    const amount = cat.value > 0 ? Math.round((value / cat.value) * cat.amount * 100) / 100 : 0;
    return { ...cat, value, amount, month: month.replace(/^\d{4}-/, '') + '月' };
  });
}

/** 月份汇总 */
export function getMonthSummary(month: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]) {
  const data = getMonthCategoryData(month, trend, categories);
  return {
    totalQuantity: data.reduce((s, d) => s + d.value, 0),
    totalAmount: data.reduce((s, d) => s + d.amount, 0),
  };
}

// ==================== 第六步：创建 Store ====================

export const useStatisticsStore = create<StatisticsState>()(
  (set)=> ({
      materialStatistics: [],
      monthlyStatistics: [],
      categorySummary: [],
      categoryTrend: [],
      isLoading: false,
      error: null,

      fetchStatistics: async () => {
        set({ isLoading: true, error: null });
        try {
          // enhancedApiClient 已自动提取 .data，resp 直接就是数据体
          const data = await enhancedApiClient.get<{
            material_statistics: Record<string, unknown>[];
            monthly_statistics: Record<string, unknown>[];
            category_summary: CategorySummaryItem[];
            category_trend: CategoryTrendItem[];
          }>('/material-statistics');

          if (data) {
            set({
              materialStatistics: (data.material_statistics || []).map(normalizeMaterialStat),
              monthlyStatistics: (data.monthly_statistics || []).map(normalizeMonthlyStat),
              categorySummary: data.category_summary || [],
              categoryTrend: data.category_trend || [],
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          // logger.warn('[StatisticsStore] API获取失败，API 失败抛错（V2.1 铁律：无缓存兜底）:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },
    })
);
