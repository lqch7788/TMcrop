/**
 * 成本配置数据
 * 集中管理成本相关配置，避免硬编码
 */

// 人工成本配置
export const COST_CONFIG = {
  // 默认人工费率（元/小时）
  LABOR_RATE_PER_HOUR: 15,
  // 工具成本比例（按物资成本的百分比估算磨损）
  TOOL_COST_RATIO: 0.1,
} as const;

// 成本计算辅助函数
export const calculateLaborCost = (hours: number): number => {
  return hours * COST_CONFIG.LABOR_RATE_PER_HOUR;
};

export const calculateToolCost = (materialCost: number): number => {
  return materialCost * COST_CONFIG.TOOL_COST_RATIO;
};
