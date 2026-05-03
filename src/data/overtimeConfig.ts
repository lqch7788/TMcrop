/**
 * 加班管理配置数据
 * 集中管理加班类型、状态等配置数据，避免硬编码
 */

import { OvertimeType } from '../types/labor/overtime';

// 加班类型选项
export const OVERTIME_TYPE_OPTIONS = [
  { value: '工作日加班', label: '工作日加班' },
  { value: '休息日加班', label: '休息日加班' },
  { value: '节假日加班', label: '节假日加班' },
] as const;

// 加班类型字符串映射到枚举
export const OVERTIME_TYPE_MAP: Record<string, OvertimeType> = {
  '工作日加班': OvertimeType.WORKDAY,
  '休息日加班': OvertimeType.WEEKEND,
  '节假日加班': OvertimeType.HOLIDAY,
};

// 加班状态筛选选项
export const OVERTIME_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
] as const;

// 加班状态颜色映射
export const OVERTIME_STATUS_COLORS: Record<string, string> = {
  '待审批': 'bg-amber-100 text-amber-700',
  '已通过': 'bg-emerald-100 text-emerald-700',
  '已拒绝': 'bg-red-100 text-red-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

// 默认基本工资（用于预览计算）
export const DEFAULT_BASE_SALARY = 6000;
