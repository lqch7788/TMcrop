/**
 * 我的任务页面常量配置
 */

import { TaskTypeConfig, StatusConfig, PriorityConfig } from './types';

// 任务类型定义
export const TASK_TYPES: TaskTypeConfig[] = [
  { value: 'fertilization', label: '施肥', color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', color: 'bg-emerald-500' },
  { value: 'other', label: '其他', color: 'bg-gray-500' },
];

// 状态映射（扩展支持问题处理流程）
export const STATUS_MAP: Record<string, StatusConfig> = {
  draft: { bg: 'bg-gray-100', color: 'text-gray-600', label: '草稿' },
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-600', label: '已接受' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '进行中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '已拒绝' },
  failed: { bg: 'bg-purple-100', color: 'text-purple-600', label: '任务失败' },
  cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: '已取消' },
  abandoned: { bg: 'bg-red-50', color: 'text-red-400', label: '已放弃' },
};

// 优先级映射
export const PRIORITY_MAP: Record<string, PriorityConfig> = {
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
 */
export const getTypeLabel = (type: string): string => {
  const taskType = TASK_TYPES.find(t => t.value === type);
  return taskType?.label || type;
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
