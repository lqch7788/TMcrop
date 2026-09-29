/**
 * 生产汇总模块常量定义
 * 阈值配置、状态颜色映射等
 */

/** 告警阈值配置 */
export const ALERT_THRESHOLDS = {
  yield: { warning: 0.8, critical: 0.5 },
  cost: { warning: 1.1, critical: 1.3 },
  task: { warning: 0.7, critical: 0.5 },
  overdue: { warning: 3, critical: 7 },
} as const;

/** 状态 → Tailwind颜色名映射 */
export const COLOR_BY_STATUS: Record<string, string> = {
  normal: 'emerald',
  warning: 'amber',
  critical: 'red',
  info: 'blue',
  batch: 'purple',
  flow: 'teal',
};

/** 产量状态阈值判断 */
export function getYieldStatus(completionRate: number): 'normal' | 'warning' | 'critical' {
  if (completionRate >= ALERT_THRESHOLDS.yield.warning) return 'normal';
  if (completionRate >= ALERT_THRESHOLDS.yield.critical) return 'warning';
  return 'critical';
}

/** 成本状态阈值判断 */
export function getCostStatus(ratio: number): 'normal' | 'warning' | 'critical' {
  if (ratio <= ALERT_THRESHOLDS.cost.warning) return 'normal';
  if (ratio <= ALERT_THRESHOLDS.cost.critical) return 'warning';
  return 'critical';
}

/** 任务完成率状态判断 */
export function getTaskStatus(rate: number): 'normal' | 'warning' | 'critical' {
  if (rate >= ALERT_THRESHOLDS.task.warning) return 'normal';
  if (rate >= ALERT_THRESHOLDS.task.critical) return 'warning';
  return 'critical';
}

// ========== V10.0: 多维度对比参数体系 (§3.4.2) ==========

/** 对比参数节点类型 */
export interface ComparisonParamNode {
  key: string;
  label: string;
  icon?: string;
  category: string;
  children?: ComparisonParamNode[];
  apiField?: string;
}

/** 多维度对比参数 — 6大类 + 子参数 */
export const COMPARISON_PARAMS: ComparisonParamNode[] = [
  {
    key: 'yield', label: '产量', category: 'products',
    children: [
      { key: 'yield', label: '产量', apiField: 'harvest_quantity', category: 'products' },
    ],
  },
  {
    key: 'fertilizer', label: '施肥量', category: 'fertilizer',
    children: [
      { key: 'fertilizer_total', label: '总施肥量', apiField: 'SUM(quantity)', category: 'fertilizer' },
      { key: 'fertilizer_cost', label: '施肥成本', apiField: 'SUM(total_cost)', category: 'fertilizer' },
    ],
  },
  {
    key: 'energy', label: '能耗', category: 'energy',
    children: [
      { key: 'ele_consume', label: '用电量', apiField: 'electricity', category: 'energy' },
      { key: 'water_consume', label: '用水量', apiField: 'water', category: 'energy' },
    ],
  },
  {
    key: 'environment', label: '环境参数', category: 'environment',
    children: [
      { key: 'air_temperature', label: '空气温度', apiField: 'air_temperature', category: 'environment' },
      { key: 'air_humidity', label: '空气湿度', apiField: 'air_humidity', category: 'environment' },
      { key: 'illumination', label: '光照', apiField: 'illumination', category: 'environment' },
      { key: 'co2', label: 'CO2含量', apiField: 'co2', category: 'environment' },
      { key: 'soil_temperature', label: '土壤温度', apiField: 'soil_temperature', category: 'environment' },
      { key: 'soil_humidity', label: '土壤湿度', apiField: 'soil_humidity', category: 'environment' },
      { key: 'soil_ph', label: '土壤pH', apiField: 'soil_ph', category: 'environment' },
      { key: 'soil_ec', label: '土壤EC', apiField: 'soil_ec', category: 'environment' },
    ],
  },
  {
    key: 'labor', label: '人工', category: 'labor',
    children: [
      { key: 'work_hours', label: '工时', apiField: 'work_hours', category: 'labor' },
      { key: 'worker_count', label: '工人数', apiField: 'worker_count', category: 'labor' },
    ],
  },
  {
    key: 'water_fat', label: '水肥灌溉', category: 'water_fat',
    children: [
      { key: 'water', label: '水值', apiField: 'water_value', category: 'water_fat' },
      { key: 'a_fat', label: 'A肥', apiField: 'a_fat_value', category: 'water_fat' },
      { key: 'b_fat', label: 'B肥', apiField: 'b_fat_value', category: 'water_fat' },
      { key: 'c_fat', label: 'C肥', apiField: 'c_fat_value', category: 'water_fat' },
    ],
  },
];

/** 扁平化参数列表（仅叶子节点） */
export function getFlatParams(): ComparisonParamNode[] {
  const result: ComparisonParamNode[] = [];
  const flatten = (nodes: ComparisonParamNode[]) => {
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        flatten(n.children);
      } else {
        result.push(n);
      }
    });
  };
  flatten(COMPARISON_PARAMS);
  return result;
}

// ========== 成本类型字典 ==========

/**
 * 成本类型：后端英文代码 → 中文标签
 *
 * 背景：`/api/summary/cost-stats` 返回的明细里，material / energy 的 `costType`
 * 是英文代码（seed、electricity…），而 labor 的 `costType` 已经是中文"人工成本"
 * （传入后原样返回）。字典原内联在 src/hooks/useProductionReports.ts 中，
 * 因成本分析页也需要同样的翻译，2026-09-29 提取到此处共享，避免两处字典漂移。
 */
export const COST_TYPE_LABELS: Record<string, string> = {
  // 物料类
  seed: '种子种苗',
  fertilizer: '肥料',
  pesticide: '农药',
  film: '基质农膜',
  // 能源类
  electricity: '电费',
  water: '水费',
  gas: '燃气费',
  utility: '水电费',
  maintenance: '维修费',
  other: '其他',
};

/**
 * 取成本类型的中文标签
 * @param type 后端返回的 costType（英文代码；labor 传中文时原样返回）
 * @returns 中文标签；未登记的取值原样返回，便于发现新增类型
 */
export function getCostTypeLabel(type?: string): string {
  if (!type) return '其他';
  return COST_TYPE_LABELS[type] || type;
}
