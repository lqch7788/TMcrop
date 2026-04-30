/**
 * 问题来源模块配置
 * 提供来源模块的标签、图标和颜色配置
 */

import { Search, Edit, Package, Wrench, HelpCircle } from 'lucide-react';

// 来源模块类型
export type SourceModuleType = 'inspection' | 'manual' | 'production' | 'equipment' | 'other';

// 来源配置项
export interface SourceConfigItem {
  label: string;           // 显示标签
  icon: typeof Search;      // 图标组件
  color: string;            // 颜色类名
  bgColor: string;         // 背景色类名
}

// 来源模块配置映射
export const SOURCE_MODULE_CONFIG: Record<SourceModuleType, SourceConfigItem> = {
  inspection: {
    label: '巡查记录',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  manual: {
    label: '手动录入',
    icon: Edit,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
  },
  production: {
    label: '生产管理',
    icon: Package,
    color: 'text-green-500',
    bgColor: 'bg-green-50 border-green-200',
  },
  equipment: {
    label: '设备管理',
    icon: Wrench,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  other: {
    label: '其他',
    icon: HelpCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 border-purple-200',
  },
};

// 获取来源配置
export function getSourceConfig(module: SourceModuleType | undefined): SourceConfigItem {
  return SOURCE_MODULE_CONFIG[module || 'other'] || SOURCE_MODULE_CONFIG.other;
}

// 来源模块选项（用于下拉筛选）
export const SOURCE_MODULE_OPTIONS: { value: SourceModuleType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'inspection', label: '巡查记录' },
  { value: 'manual', label: '手动录入' },
  { value: 'production', label: '生产管理' },
  { value: 'equipment', label: '设备管理' },
  { value: 'other', label: '其他' },
];
