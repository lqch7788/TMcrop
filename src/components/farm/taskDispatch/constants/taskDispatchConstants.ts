/**
 * 农事任务派发常量定义
 * 抽离状态映射、优先级、任务类型等常量，避免硬编码
 */

import {
  Leaf, Droplets, Scissors, Bug, Edit, Trees, ShoppingBasket,
} from 'lucide-react';

// ========== 任务状态映射（从 farmMockData 迁出，内联定义） ==========
const TASK_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  accepted: { label: '已接受', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '返工中', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: '任务失败', color: 'text-purple-600', bg: 'bg-purple-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
  abandoned: { label: '已放弃', color: 'text-red-400', bg: 'bg-red-50' },
};

// ========== 优先级映射（从 farmMockData 迁出，内联定义） ==========
const TASK_PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-500' },
  high: { label: '高', color: 'text-orange-500' },
  normal: { label: '普通', color: 'text-gray-500' },
};

// ========== 任务类型定义 ==========
export const TASK_TYPES = [
  { value: 'fertilization', label: '施肥', icon: Leaf, color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', icon: Droplets, color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', icon: Scissors, color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', icon: Bug, color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', icon: Droplets, color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', icon: Trees, color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', icon: ShoppingBasket, color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', icon: Trees, color: 'bg-emerald-500' },
  { value: 'other', label: '其他', icon: Edit, color: 'bg-gray-500' },
] as const;

// ========== 状态映射 ==========
export const STATUS_MAP = TASK_STATUS_MAP;

// ========== 优先级映射 ==========
export const PRIORITY_MAP = TASK_PRIORITY_MAP;

// ========== 批量操作状态限制 ==========
// 批量编辑时可编辑的状态（不含终态）
export const EDITABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'rejected'];

// 批量删除时可删除的状态（所有状态都可以删除）
export const DELETABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'completed', 'rejected', 'failed', 'cancelled', 'abandoned'];

// ========== 工作制配置 ==========
export const WORK_HOUR_SYSTEMS = [
  { value: '8', label: '8小时工作制', workHours: 8, startHour: 8, endHour: 17 },
  { value: '10', label: '10小时工作制', workHours: 10, startHour: 7, endHour: 18 },
  { value: '12', label: '12小时工作制', workHours: 12, startHour: 7, endHour: 19 },
] as const;

// ========== 状态选项（用于下拉筛选） ==========
export const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待接受' },
  { value: 'accepted', label: '已接受' },
  { value: 'in_progress', label: '处理中' },
  { value: 'waiting_acceptance', label: '待验收' },
  { value: 'completed', label: '已完成' },
  { value: 'rejected', label: '返工中' },
  { value: 'failed', label: '任务失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'abandoned', label: '已放弃' },
];

// ========== 时间筛选选项 ==========
export const TIME_FILTER_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
];

// ========== 分页选项 ==========
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ========== 工具函数 ==========

/**
 * 根据任务类型值获取类型标签
 */
export const getTypeLabel = (typeValue: string): string => {
  const found = TASK_TYPES.find(t => t.value === typeValue);
  return found?.label || typeValue;
};

/**
 * 根据任务类型值获取类型颜色
 */
export const getTypeColor = (typeValue: string): string => {
  const found = TASK_TYPES.find(t => t.value === typeValue);
  return found?.color || 'bg-gray-500';
};

/**
 * 格式化任务工时（按8小时=1天计算）
 */
export const formatWorkHours = (days: number, hours: number): string => {
  const totalHours = days * 8 + hours;
  const d = Math.floor(totalHours / 8);
  const h = totalHours % 8;
  let result = '';
  if (d > 0) result += `${d}天`;
  if (h > 0) result += `${h}小时`;
  return result || '0小时';
};
