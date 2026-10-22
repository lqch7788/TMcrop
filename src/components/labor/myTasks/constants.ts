/**
 * 我的任务页面常量配置
 */

import { TaskTypeConfig, StatusConfig, PriorityConfig } from './types';
import { resolveTaskTypeLabel, FARM_OPERATION_TYPES } from '../../../types/farm/common';

// 任务类型定义
// 2026-10-20 P0-10：取值从唯一真相源派生（此前含 pesticide/rootIrrigation 等失效别名）
const TYPE_COLOR_MAP: Record<string, string> = {
  planting: 'bg-lime-500',
  irrigation: 'bg-blue-500',
  fertilization: 'bg-green-500',
  pest_control: 'bg-red-500',
  pruning: 'bg-purple-500',
  harvest: 'bg-orange-500',
  weeding: 'bg-emerald-500',
  farm_repair: 'bg-amber-500',
  equipment_repair: 'bg-amber-600',
  cleaning: 'bg-slate-500',
  seedling: 'bg-teal-500',
  // 2026-10-21：巡查（系统类型）
  inspection: 'bg-sky-600',
  other: 'bg-gray-500',
};
export const TASK_TYPES: TaskTypeConfig[] = FARM_OPERATION_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
  color: TYPE_COLOR_MAP[t.value] ?? 'bg-gray-500',
}));

// 状态映射（扩展支持问题处理流程）
export const STATUS_MAP: Record<string, StatusConfig> = {
  draft: { bg: 'bg-gray-100', color: 'text-gray-600', label: '草稿' },
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-600', label: '已接受' },
  // 2026-10-20 统一口径：此前这里是「进行中」，农事任务中心与全局配置都是「处理中」，
  // 同一条任务在两页显示不同中文，用户对不上号。统一为「处理中」。
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '处理中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '返工中' },
  failed: { bg: 'bg-purple-100', color: 'text-purple-600', label: '任务失败' },
  cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: '已取消' },
  abandoned: { bg: 'bg-red-50', color: 'text-red-400', label: '已放弃' },
  // 2026-10-20 补齐：这三个值此前缺失，导致「我的任务」把英文原样显示出来
  // （农事任务中心 counterparts 已有中文标签，两页显示不一致）
  pending_approval: { bg: 'bg-amber-100', color: 'text-amber-600', label: '派发审批中' },
  pending_reassign: { bg: 'bg-orange-100', color: 'text-orange-600', label: '待重新派发' },
  // 巡查记录原始状态（未关联整改问题时直接透出）
  attention: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待处理' },
  normal: { bg: 'bg-green-100', color: 'text-green-600', label: '正常' },
  overdue: { bg: 'bg-red-100', color: 'text-red-600', label: '已超期' },
};

// 优先级映射
// 2026-10-11：补 critical（temp_tasks.priority 实际存在该值，缺失会导致"全部任务"表优先级列显示英文；
//   中文口径与 TEMP_TASK_URGENCY_CONFIG 的 critical='非常紧急' 保持一致）
export const PRIORITY_MAP: Record<string, PriorityConfig> = {
  critical: { color: 'text-red-600', label: '非常紧急' },
  urgent: { color: 'text-red-500', label: '紧急' },
  high: { color: 'text-orange-500', label: '高' },
  medium: { color: 'text-yellow-500', label: '中' },
  low: { color: 'text-green-500', label: '低' },
  normal: { color: 'text-gray-500', label: '普通' },
};

/**
 * 获取任务类型颜色
 */
export const getTypeColor = (type: string): string => {
  const taskType = TASK_TYPES.find(t => t.value === type);
  return taskType?.color || 'bg-gray-500';
};

/**
 * 获取任务类型标签
 * 2026-10-11：多级回退 —— TaskType(9) → 农事操作总字典，避免"任务类型"列显示英文 code
 * 2026-10-21（阶段 3）：临时任务类型已并入 FARM_OPERATION_TYPES，中间层删除
 */
export const getTypeLabel = (type: string): string => {
  // 2026-10-21：统一解析器（含系统类型 inspection 与历史类型兜底）
  return resolveTaskTypeLabel(type);
};

/**
 * 格式化日期为短格式（4月19日 8:00）
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  // 尝试解析日期，支持多种格式
  let date: Date;
  try {
    date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      date = new Date(dateStr.replace(' ', 'T'));
    }
    if (isNaN(date.getTime())) {
      return '-';
    }
  } catch {
    return '-';
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:00`;
}

/**
 * 计算预计结束日期
 */
export function formatExpectedEndDate(startDateStr: string, estimatedDays: number, estimatedHours: number = 0): string {
  if (!startDateStr) return '-';
  // 如果既没有天数也没有小时，返回 '-'
  if (!estimatedDays && !estimatedHours) return '-';

  // 尝试解析日期
  let startDate: Date;
  try {
    startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(startDateStr.replace(' ', 'T'));
    }
    if (isNaN(startDate.getTime())) {
      return '-';
    }
  } catch {
    return '-';
  }

  // 如果只有小时数（没有天数），按半天计算（4小时以内算半天下班12:00，4小时以上算整天下班17:00）
  if (!estimatedDays && estimatedHours) {
    const endDate = new Date(startDate);
    if (estimatedHours <= 4) {
      // 半天，12:00结束
      endDate.setHours(12, 0, 0, 0);
    } else {
      // 整天，17:00结束
      endDate.setHours(17, 0, 0, 0);
    }
    const month = endDate.getMonth() + 1;
    const day = endDate.getDate();
    return `${month}月${day}日 ${estimatedHours <= 4 ? '12:00' : '17:00'}`;
  }

  // 结束日期 = 开始日期 + (预估天数 - 1) 天
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.floor(estimatedDays) - 1);

  // 如果有0.5天，结束时间是12:00，否则是17:00
  const hasHalfDay = estimatedDays % 1 !== 0;
  endDate.setHours(hasHalfDay ? 12 : 17, 0, 0, 0);

  const month = endDate.getMonth() + 1;
  const day = endDate.getDate();
  return `${month}月${day}日 ${hasHalfDay ? '12:00' : '17:00'}`;
}
