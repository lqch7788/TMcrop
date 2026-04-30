// 批次状态颜色配置
export const batchStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',       // 草稿
  published: 'bg-blue-100 text-blue-700',    // 已发布
  in_progress: 'bg-emerald-100 text-emerald-700', // 执行中
  completed: 'bg-green-600 text-white',   // 已完成 - 深绿色底色白字
  cancelled: 'bg-gray-300 text-gray-600',    // 已作废 - 深灰色
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
  published: '已发布',
  in_progress: '执行中',
  completed: '已完成',
  cancelled: '已作废',
};

export const stageProgress: Record<string, number> = {
  seedling: 15,
  vegetative: 40,
  flowering: 65,
  fruiting: 85,
  harvest: 100,
};

// 负责人列表（武侠人物）
export const RESPONSIBLE_PERSONS = [
  '郭靖', '黄蓉', '张无忌', '令狐冲', '萧峰', '段誉', '虚竹', '杨过'
];
