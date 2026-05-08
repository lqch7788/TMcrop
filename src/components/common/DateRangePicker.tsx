/**
 * 日期范围选择器组件
 * 用于人工管理模块的筛选功能，支持日期范围选择
 * 从 antd DatePicker 替换为 @/components/ui DateRangePicker
 */

import React from 'react';
import { DateRangePicker as UIDateRangePicker } from '@/components/ui';
import dayjs from 'dayjs';

// ============================================
// Props 接口定义
// ============================================
export interface DateRangePickerProps {
  /** 当前选中的日期值，格式为 [开始日期, 结束日期] 的 Dayjs 数组或 null */
  value?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  /** 日期范围变化时的回调函数 */
  onChange?: (value: [dayjs.Dayjs, dayjs.Dayjs] | null) => void;
  /** 输入框 placeholder 文本 */
  placeholder?: [string, string];
  /** 是否显示清除按钮，默认 true */
  allowClear?: boolean;
  /** 是否禁用组件，默认 false */
  disabled?: boolean;
  /** 日期格式，默认 'YYYY-MM-DD' */
  format?: string;
}

// ============================================
// 组件实现
// ============================================
export function DateRangePicker({
  value = null,
  onChange,
  placeholder,
  allowClear = true,
  disabled = false,
  format = 'YYYY-MM-DD',
}: DateRangePickerProps) {
  /**
   * 处理日期范围变化的回调
   * UI组件库使用 Date 类型，转换为 Dayjs
   */
  const handleChange = (start: Date | undefined, end: Date | undefined) => {
    if (onChange) {
      if (start && end) {
        onChange([dayjs(start), dayjs(end)]);
      } else {
        onChange(null);
      }
    }
  };

  // 转换 value 从 Dayjs 数组到 Date 数组
  const dateValue: [Date | undefined, Date | undefined] = value
    ? [value[0].toDate(), value[1].toDate()]
    : [undefined, undefined];

  return (
    <UIDateRangePicker
      startDate={dateValue[0]}
      endDate={dateValue[1]}
      onChange={handleChange}
      placeholder={placeholder?.[0] || '选择日期范围'}
      disabled={disabled}
    />
  );
}

export default DateRangePicker;
