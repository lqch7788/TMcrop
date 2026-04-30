/**
 * 日期范围选择器组件
 * 用于人工管理模块的筛选功能，支持单日期和日期范围选择
 */

import React from 'react';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

// 提取 RangePicker 类型
const { RangePicker } = DatePicker;

// ============================================
// Props 接口定义
// ============================================
export interface DateRangePickerProps {
  /** 当前选中的日期值，格式为 [开始日期, 结束日期] 的 Dayjs 数组或 null */
  value?: [Dayjs, Dayjs] | null;
  /** 日期范围变化时的回调函数 */
  onChange?: (value: [Dayjs, Dayjs] | null) => void;
  /** 输入框 placeholder 文本，默认 ['开始日期', '结束日期'] */
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
  placeholder = ['开始日期', '结束日期'],
  allowClear = true,
  disabled = false,
  format = 'YYYY-MM-DD',
}: DateRangePickerProps) {
  /**
   * 处理日期范围变化的回调
   * @param dates - 选中的日期范围 [Dayjs, Dayjs] 或 null
   */
  const handleChange = (dates: [Dayjs, Dayjs] | null) => {
    if (onChange) {
      onChange(dates);
    }
  };

  return (
    <RangePicker
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      format={format}
      // 使用中文本地化
      locale={{
        lang: {
          locale: 'zh_CN',
          year: '年',
          month: '月',
          day: '日',
          hour: '时',
          minute: '分',
          second: '秒',
          quarter: '季',
          era: '纪元',
          week: '周',
          firstDayOfWeek: 1,
          dayOfMonth: [],
          shortWeekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
          shortMonth: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        },
        timePickerLocale: {
          placeholder: '请选择时间',
        },
      }}
      // 预设快捷选项
      presets={[
        { label: '今天', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
        { label: '本周', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
        { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
        { label: '本季度', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
        { label: '今年', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
      ]}
      // 自定义样式
      style={{ width: '100%' }}
    />
  );
}

export default DateRangePicker;
