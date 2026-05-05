/**
 * 成本核算类型定义
 * 用于成本类别、预算管理等
 */

/**
 * 成本类别类型
 */
export type CostCategoryType = 'material' | 'labor' | 'equipment' | 'energy' | 'other';

/**
 * 成本类别状态
 */
export type CostCategoryStatus = 'active' | 'inactive';

/**
 * 预算状态
 */
export type BudgetStatus = 'active' | 'completed' | 'cancelled';

/**
 * 成本类别接口
 */
export interface CostCategory {
  id: string;
  name: string;
  code: string;
  type: CostCategoryType;
  unit: string;
  description: string;
  status: CostCategoryStatus;
}

/**
 * 成本预算接口
 */
export interface CostBudget {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  usedAmount: number;
  period: string;
  status: BudgetStatus;
}

/**
 * 成本类别类型映射（中文标签）
 */
export const COST_CATEGORY_TYPE_MAP: Record<CostCategoryType, string> = {
  material: '物料',
  labor: '人工',
  equipment: '设备',
  energy: '能源',
  other: '其他',
};

/**
 * 成本类别状态映射
 */
export const COST_CATEGORY_STATUS_MAP: Record<CostCategoryStatus, string> = {
  active: '启用',
  inactive: '停用',
};

/**
 * 预算状态映射
 */
export const BUDGET_STATUS_MAP: Record<BudgetStatus, string> = {
  active: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};
