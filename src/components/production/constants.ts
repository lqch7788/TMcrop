// 批次状态颜色配置
export const batchStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',       // 草稿
  pending: 'bg-amber-100 text-amber-700',    // 待审批
  pending_complete: 'bg-orange-100 text-orange-700', // 待审批（完成）
  published: 'bg-blue-100 text-blue-700',    // 已发布
  approved: 'bg-blue-100 text-blue-700',     // 已审批通过
  in_progress: 'bg-emerald-100 text-emerald-700', // 执行中
  completed: 'bg-green-600 text-white',   // 已完成 - 深绿色底色白字
  cancelled: 'bg-gray-300 text-gray-600',    // 已作废 - 深灰色
  rejected: 'bg-red-100 text-red-700',       // 已拒绝
};

// 计划类型选项配置
import { PlanType, PlanTypeLabels, PlanTypeColors } from '../../types';

export { PlanType, PlanTypeLabels, PlanTypeColors };

/**
 * 计划类型下拉选项
 */
export const planTypeOptions = Object.entries(PlanTypeLabels).map(([value, label]) => ({
  value: value as PlanType,
  label,
  color: PlanTypeColors[value as PlanType],
}));

// 批次状态文本配置
export const batchStatusLabels: Record<string, string> = {
  draft: '草稿',
  pending: '待审批',
  pending_complete: '待审批（完成）',
  published: '已发布',
  approved: '已通过',
  in_progress: '执行中',
  completed: '已完成',
  cancelled: '已作废',
  rejected: '已拒绝',
};

// 执行状态颜色配置（双轨并行）
export const executionStatusColors: Record<string, string> = {
  pending_execution: 'bg-blue-100 text-blue-700',  // 待执行
  in_progress: 'bg-orange-100 text-orange-700',    // 进行中
  completed: 'bg-green-100 text-green-700',         // 已完成
};

// 执行状态文本配置
export const executionStatusLabels: Record<string, string> = {
  pending_execution: '待执行',
  in_progress: '进行中',
  completed: '已完成',
};

// M-11: unused — 旧版阶段进度配置（已用 batchStatus 双轨并行替代；保留供历史/导出使用）
export const stageProgress: Record<string, number> = {
  seedling: 15,
  vegetative: 40,
  flowering: 65,
  fruiting: 85,
  harvest: 100,
};

// L-08: 负责人列表改为派生自 useUserStore
// 旧版硬编码武侠人物 fallback 已废弃；当前仍用本地常量兜底，迁移到 Store 由 UI 决定加载时机
export const RESPONSIBLE_PERSONS: string[] = [
  '郭靖', '黄蓉', '张无忌', '令狐冲', '萧峰', '段誉', '虚竹', '杨过'
];

// ============================================
// 各类计划的模式配置
// ============================================

/**
 * 育种计划（种源采购）模式 - V3.0扩展
 */
export const SEED_BREEDING_MODES = [
  { value: 'supplier_direct', label: '供应商直供' },
  { value: 'bidding', label: '招标采购' },
  { value: 'designated', label: '定点采购' },
  { value: 'internal_seed', label: '内部种源' },
  { value: 'external_purchase', label: '外部采购' },
  { value: 'tissue_culture', label: '组培苗' },
  { value: 'grafting', label: '嫁接苗' },
  { value: 'seedling_split', label: '分株繁殖' },
  { value: 'cutting', label: '扦插繁殖' },
];

/**
 * 育苗计划模式
 */
export const SEEDLING_MODES = [
  { value: 'plug_seedling', label: '穴盘育苗' },
  { value: 'floating', label: '漂浮育苗' },
  { value: 'nutrient_block', label: '营养钵育苗' },
  { value: 'grafting', label: '嫁接育苗' },
  { value: 'tissue_culture', label: '组培育苗' },
  { value: 'direct_seeding', label: '直播育苗' },
];

/**
 * 种植计划模式
 */
export const PLANTING_MODES = [
  { value: 'open_field', label: '露天栽培' },
  { value: 'greenhouse', label: '大棚栽培' },
  { value: 'mulch', label: '地膜覆盖' },
  { value: 'intercropping', label: '套种轮作' },
  { value: 'vertical', label: '立体栽培' },
  { value: 'hydroponic', label: '水培' },
  { value: 'substrate', label: '基质栽培' },
];

/**
 * 根据计划类型获取对应的模式列表
 *
 * L-09: 显式覆盖 3 个 PlanType 枚举值；未知类型返回空数组（不再静默 fallback 到 PLANTING_MODES）
 * 原因：原 default fallback 会导致拼错的 planType 也能下拉选项，难以排查
 */
export const getModesByPlanType = (planType: PlanType): { value: string; label: string }[] => {
  switch (planType) {
    case PlanType.SEED_BREEDING:
      return SEED_BREEDING_MODES;
    case PlanType.SEEDLING:
      return SEEDLING_MODES;
    case PlanType.PLANTING:
      return PLANTING_MODES;
    default:
      // 显式返回空数组并打 console.warn（避免静默 fallback 到 PLANTING_MODES）
      console.warn(`[getModesByPlanType] 未识别的 planType: ${planType}，返回空列表`);
      return [];
  }
};
