/**
 * 通用筛选工具栏容器组件
 * 提供统一的筛选区域布局样式和按钮
 * 适用于种源管理、育苗管理、订单管理、采收管理等模块的筛选展示
 */

import React from 'react';
import { Search, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui';

// 按钮类型
export interface FilterButtonProps {
  /** 点击事件 */
  onClick: () => void;
  /** 图标 */
  icon?: React.ReactNode;
  /** 子文本 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 变体类型 */
  variant?: 'primary' | 'secondary' | 'gray';
}

/**
 * 筛选按钮组件
 */
export function FilterButton({
  onClick,
  icon,
  children,
  className = '',
  variant = 'gray'
}: FilterButtonProps) {
  // FilterButton variant 映射到 Button 组件的 variant
  const buttonVariantMap: Record<string, 'default' | 'blue' | 'secondary'> = {
    primary: 'default',
    secondary: 'blue',
    gray: 'secondary'
  };

  return (
    <Button
      variant={buttonVariantMap[variant]}
      onClick={onClick}
      className={className}
    >
      {icon}
      {children}
    </Button>
  );
}

// FilterToolbar组件属性
export interface FilterToolbarProps {
  /** 搜索回调 */
  onSearch: () => void;
  /** 重置回调 */
  onReset: () => void;
  /** 是否显示更多按钮 */
  showMore?: boolean;
  /** 更多展开状态 */
  moreExpanded?: boolean;
  /** 更多按钮点击回调 */
  onMoreToggle?: () => void;
  /** 自定义样式类名 */
  className?: string;
  /** 筛选字段区域 */
  children: React.ReactNode;
}

/**
 * 通用筛选工具栏容器组件
 * 提供统一的背景、布局和按钮区域
 *
 * @example
 * ```tsx
 * <FilterToolbar onSearch={handleSearch} onReset={handleReset}>
 *   <div className="flex flex-wrap gap-4 items-end">
 *     {/* 筛选字段 *\/}
 *   </div>
 * </FilterToolbar>
 * ```
 */
export function FilterToolbar({
  onSearch,
  onReset,
  showMore = false,
  moreExpanded = false,
  onMoreToggle,
  className = '',
  children
}: FilterToolbarProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      {children}

      {/* 按钮行 - 单独处理，支持flex-end对齐 */}
      <div className="flex justify-end gap-2 mt-4">
        {showMore && onMoreToggle && (
          <FilterButton
            onClick={onMoreToggle}
            icon={moreExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            variant="secondary"
          >
            {moreExpanded ? '收起' : '更多'}
          </FilterButton>
        )}
        <FilterButton onClick={onReset} icon={<RotateCcw className="w-4 h-4" />} variant="gray">
          重置
        </FilterButton>
        <FilterButton onClick={onSearch} icon={<Search className="w-4 h-4" />} variant="primary">
          搜索
        </FilterButton>
      </div>
    </div>
  );
}

/**
 * 筛选字段容器类名
 * 提供统一的字段容器宽度样式
 */
export const filterFieldClasses = {
  // 基础宽度
  base: 'min-w-[120px]',
  // 扩展宽度
  wide: 'min-w-[150px]',
  // 最大宽度
  full: 'flex-1 min-w-[150px]'
};

/**
 * 标签样式类名
 */
export const filterLabelClasses = 'block text-sm font-medium text-gray-700 mb-1';

/**
 * 输入框/下拉框基础样式
 */
export const filterInputClasses = 'w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';

export default FilterToolbar;
