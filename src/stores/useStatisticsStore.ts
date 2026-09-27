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
  /** 2026-09-27 审计修复：退料量（出库实发后经生产退料回流的部分；老数据无此字段，可选） */
  returnedQuantity?: number;
  /** 净消耗 = 实发量 - 退料量 */
  netQuantity?: number;
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
  /** 2026-09-27 审计修复：退料量（差异率按净消耗口径，后端已算好下发） */
  returnedQuantity: number;
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
  returned_quantity: 'returnedQuantity',
  net_quantity: 'netQuantity',
  actual_amount: 'actualAmount',
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
    // 2026-09-26 修复：后端响应已 camelCase，优先读 camelCase，snake_case 兜底
    if (camel in db) result[camel] = db[camel];
    else if (snake in db) result[camel] = db[snake];
  }
  return result as unknown as MaterialStatItem;
}

function normalizeMonthlyStat(db: Record<string, unknown>): MonthlyStatItem {
  const result: Record<string, unknown> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    // 2026-09-26 修复：后端响应已 camelCase，优先读 camelCase，snake_case 兜底
    if (camel in db) result[camel] = db[camel];
    else if (snake in db) result[camel] = db[snake];
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
    const qty = (monthData as unknown as Record<string, number>)[cat.key] || 0;
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

/**
 * 年度总金额（万元）
 * 2026-09-27 审计修复：此前忽略 year 参数恒返回全时段金额（切换年份金额不变）。
 * 改为"该年各分类数量 × 分类均价（全时段金额/数量）"估算；该年无数据返回 0。
 */
export function getYearTotalAmount(year: string, trend: CategoryTrendItem[], categories: CategorySummaryItem[]): number {
  const yearRows = trend.filter(d => d.month.startsWith(year));
  if (yearRows.length === 0) return 0;
  let amount = 0;
  for (const cat of categories) {
    const avgPrice = cat.value > 0 ? cat.amount / cat.value : 0;
    if (avgPrice <= 0) continue;
    // 2026-09-27 修复：trend 行的键是中文短名（key），非带前缀的 name（如 'OP-作业支持类'）
    const qty = yearRows.reduce(
      (s, row) => s + (Number((row as unknown as Record<string, number>)[cat.key]) || 0), 0
    );
    amount += qty * avgPrice;
  }
  return amount;
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
    const value = (monthData as unknown as Record<string, number>)[cat.key] || 0;
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

/**
 * 2026-09-27 审计修复（A2）：按年份聚合分类汇总——
 * 此前 categorySummary 是全时段无年份维度，环形图/分类卡片/年度合计金额在切换年份时全部不变。
 * 该年各分类数量（从 trend 取）× 分类均价（全时段金额/数量）→ 该年分类汇总；无数据年份返回空数组。
 */
export function getCategorySummaryByYear(
  year: string,
  trend: CategoryTrendItem[],
  categories: CategorySummaryItem[]
): CategorySummaryItem[] {
  const yearRows = trend.filter((d) => d.month.startsWith(year));
  if (yearRows.length === 0) return [];
  const result: CategorySummaryItem[] = [];
  let yearTotalQty = 0;
  for (const cat of categories) {
    const qty = yearRows.reduce(
      (s, row) => s + (Number((row as unknown as Record<string, number>)[cat.key]) || 0), 0
    );
    if (qty <= 0) continue;
    const avgPrice = cat.value > 0 ? cat.amount / cat.value : 0;
    const amount = Math.round(qty * avgPrice * 100) / 100;
    yearTotalQty += qty;
    result.push({ ...cat, value: qty, amount });
  }
  // 重算该年占比
  for (const c of result) {
    c.percentage = yearTotalQty > 0 ? Math.round((c.value / yearTotalQty) * 1000) / 10 : 0;
  }
  return result;
}

/** 月度汇总行（含实发量与真实金额，2026-09-27 A2 数据链补完） */
export interface MonthSummaryWithActual {
  month: string;
  monthName: string;
  totalQuantity: number;   // 申请量
  actualQuantity: number;  // 实发量（已扣库存出库单聚合）
  /** 2026-09-27 审计修复：退料量（差异率按净消耗 = 实发 - 退料 计算） */
  returnedQuantity: number;
  totalAmount: number;     // 真实申请金额（monthly_statistics.total_amount 聚合，元）
  differenceRate: number;  // 差异率 %（净消耗-申请）/申请
  departments: string[];   // 该月涉及的部门
  percentage: number;      // 占年度申请量比
}

/**
 * 2026-09-27 审计修复（A2）：月度汇总真实数据聚合——
 * 此前 getMonthSummaries 用 categoryTrend（申请量口径）且金额按比例分摊（估算值）；
 * monthlyStatistics（后端已聚合实发量/差异率/真实金额）完全未被前端使用。
 * 本函数按"年-月"跨部门聚合 monthlyStatistics；trend 兜底补全年月份（无申请单的月份）。
 */
export function getMonthSummariesWithActual(
  year: string,
  monthlyStats: MonthlyStatItem[],
  trend: CategoryTrendItem[],
  /** 2026-09-27（B6）：按部门过滤后聚合（'all'/空 = 全部部门） */
  dept?: string
): MonthSummaryWithActual[] {
  const map = new Map<string, MonthSummaryWithActual>();
  const deptActive = !!dept && dept !== 'all';
  for (const m of monthlyStats) {
    if (m.year !== year) continue;
    // 2026-09-27 修复：部门筛选在聚合前过滤——此前聚合后按 departments.includes 过滤，
    // 只过滤"月份是否含该部门"而非"该部门的数据"，显示的是全部门合并值（语义错误）
    if (deptActive && m.department !== dept) continue;
    const key = `${m.year}-${m.month}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += m.totalQuantity || 0;
      existing.actualQuantity += m.actualQuantity || 0;
      existing.returnedQuantity += m.returnedQuantity || 0;
      existing.totalAmount += m.totalAmount || 0;
      if (m.department && !existing.departments.includes(m.department)) existing.departments.push(m.department);
    } else {
      map.set(key, {
        month: key,
        monthName: `${parseInt(m.month)}月`,
        totalQuantity: m.totalQuantity || 0,
        actualQuantity: m.actualQuantity || 0,
        returnedQuantity: m.returnedQuantity || 0,
        totalAmount: m.totalAmount || 0,
        differenceRate: m.differenceRate || 0,
        departments: m.department ? [m.department] : [],
        percentage: 0,
      });
    }
  }
  // 合并 trend 中存在的月份（含无申请单但 trend 有值的月份——实际二者同源，trend 兜底）
  // 2026-09-27 修复：部门筛选视图跳过 trend 兜底——trend 是全部门申请量维度，
  // 会把"无该部门数据"的月份用全部门值补齐（8月173/9月10 就是误补的结果）
  for (const t of trend) {
    if (!t.month.startsWith(year)) continue;
    if (deptActive) break;
    if (!map.has(t.month)) {
      map.set(t.month, {
        month: t.month,
        monthName: `${parseInt(t.month.split('-')[1])}月`,
        totalQuantity: t.total || 0,
        actualQuantity: 0,
        returnedQuantity: 0,
        totalAmount: 0,
        differenceRate: 0,
        departments: [],
        percentage: 0,
      });
    }
  }
  const rows = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  // 重算差异率（跨部门聚合后，2026-09-27 改净消耗口径）与占比
  const yearTotal = rows.reduce((s, r) => s + r.totalQuantity, 0);
  for (const r of rows) {
    const netQuantity = r.actualQuantity - r.returnedQuantity;
    r.differenceRate = r.totalQuantity > 0
      ? Math.round(((netQuantity - r.totalQuantity) / r.totalQuantity) * 1000) / 10
      : 0;
    r.percentage = yearTotal > 0 ? Math.round((r.totalQuantity / yearTotal) * 1000) / 10 : 0;
  }
  return rows;
}

/**
 * 2026-09-27 审计修复（A3）：跨年度取趋势值——
 * 同比修复用：此前 getMonthStats 在"本年度过滤后的列表"里查上一年度月份，永远查不到（同比恒为'-'）。
 */
export function getTrendTotalByMonth(month: string, trend: CategoryTrendItem[]): number {
  const d = trend.find((x) => x.month === month);
  return d ? d.total : 0;
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
          // 2026-09-26 修复：后端 camelCaseResponse 中间件已把响应键转为 camelCase，
          // 此前读 snake_case 键恒为 undefined → 统计页全 0。保留 snake 兜底容错。
          const data = await enhancedApiClient.get<{
            materialStatistics?: Record<string, unknown>[];
            monthlyStatistics?: Record<string, unknown>[];
            categorySummary?: CategorySummaryItem[];
            categoryTrend?: CategoryTrendItem[];
            material_statistics?: Record<string, unknown>[];
            monthly_statistics?: Record<string, unknown>[];
            category_summary?: CategorySummaryItem[];
            category_trend?: CategoryTrendItem[];
          }>('/material-statistics');

          if (data) {
            set({
              materialStatistics: (data.materialStatistics ?? data.material_statistics ?? []).map(normalizeMaterialStat),
              monthlyStatistics: (data.monthlyStatistics ?? data.monthly_statistics ?? []).map(normalizeMonthlyStat),
              categorySummary: data.categorySummary ?? data.category_summary ?? [],
              categoryTrend: data.categoryTrend ?? data.category_trend ?? [],
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
