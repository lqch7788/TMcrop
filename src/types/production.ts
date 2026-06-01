// ============================================================
// 生产计划模块类型定义
// 文件路径：src/types/production.ts
// 这些类型是从 V1.2 的 index.ts 中引用的，但原始文件不存在
// ============================================================

// 采购计划项
export interface PurchasePlanItem {
  materialId: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  supplier?: string;
}

// 采购计划
export interface PurchasePlan {
  id: string;
  planCode: string;
  applicantId: string;
  applicantName: string;
  department: string;
  applyDate: string;
  items: PurchasePlanItem[];
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'purchasing' | 'completed';
  expectedDeliveryDate: string;
  remarks?: string;
}

// 生产流程
export interface ProductionFlow {
  id: string;
  name: string;
  stage: string;
  order: number;
  duration: number;
  tasks: string[];
}

// 统计卡片颜色
export type StatCardColor = 'green' | 'blue' | 'amber' | 'red' | 'purple';

// 统计卡片配置
export interface StatCardItem {
  label: string;
  value: string | number;
  color?: StatCardColor;
  icon?: string;
  trend?: number;
}

// 饼图数据
export interface PieChartData {
  name: string;
  value: number;
}

// 折线图数据
export interface LineChartData {
  name: string;
  value: number;
}

// 柱状图数据
export interface BarChartData {
  name: string;
  value: number;
}

// 筛选选项
export interface FilterOption {
  value: string;
  label: string;
}

// 筛选值
export interface FilterValues {
  [key: string]: string | string[] | undefined;
}

// 批次状态统计
export interface BatchStatusStats {
  planned: number;
  inProgress: number;
  completed: number;
  suspended: number;
  cancelled: number;
}

// 生产阶段
export interface ProductionStage {
  key: string;
  label: string;
  color: string;
}

// 生产阶段配置
export interface ProductionStageConfig {
  stages: ProductionStage[];
}

// 批次选择选项
export interface BatchSelectorOption {
  value: string;
  label: string;
  cropName?: string;
  greenhouseName?: string;
}

// 技术方案选择选项
export interface TechSolutionSelectorOption {
  value: string;
  label: string;
  cropName?: string;
}

// 采购计划选择选项
export interface PurchasePlanSelectorOption {
  value: string;
  label: string;
  totalAmount?: number;
}